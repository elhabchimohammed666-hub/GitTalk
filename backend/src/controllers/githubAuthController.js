import { randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const stateCookie = "devhub_oauth_state";

function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/api/auth/github"
  };
}

function redirectToFrontend(res, error) {
  const destination = new URL("/", process.env.CLIENT_ORIGIN || "http://localhost:5173");
  if (error) destination.searchParams.set("error", error);
  return res.redirect(destination.toString());
}

async function githubRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "DevHub"
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }
  return response.json();
}

export function startGithubAuth(req, res) {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({ message: "GitHub sign-in is not configured" });
  }

  const state = randomBytes(32).toString("hex");
  res.cookie(stateCookie, state, oauthCookieOptions());
  const authorizationUrl = new URL("https://github.com/login/oauth/authorize");
  authorizationUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  authorizationUrl.searchParams.set(
    "redirect_uri",
    process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
  );
  authorizationUrl.searchParams.set("scope", "read:user user:email");
  authorizationUrl.searchParams.set("state", state);
  return res.redirect(authorizationUrl.toString());
}

export async function finishGithubAuth(req, res) {
  const { state, code, error } = req.query;
  const savedState = req.cookies?.[stateCookie];
  res.clearCookie(stateCookie, oauthCookieOptions());

  const stateBuffer = typeof state === "string" ? Buffer.from(state) : null;
  const savedStateBuffer = typeof savedState === "string" ? Buffer.from(savedState) : null;
  if (error || typeof code !== "string" || !stateBuffer || !savedStateBuffer ||
      stateBuffer.length !== savedStateBuffer.length ||
      !timingSafeEqual(stateBuffer, savedStateBuffer)) {
    return redirectToFrontend(res, "github_auth_failed");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "DevHub"
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!tokenResponse.ok) throw new Error("GitHub token exchange failed");

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error("GitHub did not return an access token");

    const profile = await githubRequest("https://api.github.com/user", tokenData.access_token);
    const emailResponse = await githubRequest("https://api.github.com/user/emails", tokenData.access_token);
    const repositories = await githubRequest(
      "https://api.github.com/user/repos?visibility=public&affiliation=owner&per_page=100&sort=pushed",
      tokenData.access_token
    );
    const email = emailResponse.find((item) => item.primary && item.verified)?.email
      ?? emailResponse.find((item) => item.verified)?.email;
    if (!email) return redirectToFrontend(res, "github_email_required");

    const languageCounts = new Map();
    for (const repository of repositories) {
      if (repository.language) {
        languageCounts.set(repository.language, (languageCounts.get(repository.language) || 0) + 1);
      }
    }
    const topLanguages = [...languageCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([language]) => language);

    let user = await User.findOne({ githubId: String(profile.id) });
    if (!user) {
      const emailOwner = await User.findOne({ email: email.toLowerCase() }).select("_id");
      if (emailOwner) return redirectToFrontend(res, "github_account_exists");

      const githubBase = (profile.login || "developer")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 22) || "developer";
      let username = githubBase;
      if (await User.exists({ username })) {
        username = `${githubBase.slice(0, 22)}_${String(profile.id).slice(-6)}`;
      }

      user = await User.create({
        username,
        email,
        githubId: String(profile.id),
        avatar: profile.avatar_url || "",
        bio: profile.bio || "",
        location: profile.location || "",
        links: { github: profile.html_url || "" },
        githubStats: {
          publicRepos: profile.public_repos || 0,
          followers: profile.followers || 0,
          topLanguages
        }
      });
    } else {
      user.avatar = profile.avatar_url || user.avatar;
      user.bio = profile.bio || user.bio;
      user.location = profile.location || user.location;
      user.githubStats.publicRepos = profile.public_repos || 0;
      user.githubStats.followers = profile.followers || 0;
      user.githubStats.topLanguages = topLanguages;
      await user.save();
    }

    const session = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });
    res.cookie("devhub_token", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    return redirectToFrontend(res);
  } catch (requestError) {
    console.error("GitHub authentication failed", requestError);
    return redirectToFrontend(res, "github_auth_failed");
  }
}
