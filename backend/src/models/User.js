import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model } = mongoose;

const githubStatsSchema = new Schema(
  {
    publicRepos: { type: Number, min: 0, default: 0 },
    followers: { type: Number, min: 0, default: 0 },
    topLanguages: [{ type: String, trim: true }]
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_-]+$/
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required() {
        return !this.githubId;
      }
    },
    githubId: { type: String, unique: true, sparse: true },
    avatar: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    links: {
      github: { type: String, trim: true, default: "" },
      linkedIn: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "" }
    },
    role: {
      type: String,
      enum: ["junior", "senior", "lead"],
      default: "junior"
    },
    location: { type: String, trim: true, maxlength: 100, default: "" },
    skills: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    badges: [{ type: String, trim: true }],
    githubStats: { type: githubStatsSchema, default: () => ({}) },
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    isOnline: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

userSchema.index({ username: 1 }, { unique: true });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default model("User", userSchema);
