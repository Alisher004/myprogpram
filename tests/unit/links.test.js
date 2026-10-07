import { describe, expect, it } from "vitest";
import { isAllowedLink } from "../../src/data/submissions";

describe("homework link validation (client side)", () => {
  it.each([
    "https://github.com/user/repo",
    "https://user.github.io/site",
    "https://my-app.vercel.app",
    "https://my-app.netlify.app/page",
  ])("accepts %s", (url) => expect(isAllowedLink(url)).toBe(true));

  it.each([
    "http://github.com/user/repo",
    "javascript:alert(1)",
    "https://evil.dev",
    "https://github.com.evil.dev/x",
    "https://notgithub.com/x",
    "not a url",
    "",
  ])("rejects %s", (url) => expect(isAllowedLink(url)).toBe(false));
});
