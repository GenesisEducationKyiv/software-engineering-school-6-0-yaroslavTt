import axios, { AxiosInstance } from "axios";
import Redis from "ioredis";
import * as github from "../../src/services/githubService";
import * as redisService from "../../src/utils/redis/redisService";
import { RateLimitError } from "../../src/errors";

let mockGet: jest.Mock;

beforeEach(() => {
  mockGet = jest.fn();
  const fakeClient = { get: mockGet } as unknown as AxiosInstance;
  github.setHttpClient(fakeClient);
  redisService.setRedisClient(null);
});

afterEach(() => {
  github.setHttpClient(null);
  redisService.setRedisClient(null);
});

describe("repoExists", () => {
  it("returns true when GitHub responds 200", async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: {} });
    const result = await github.repoExists("golang", "go");
    expect(result).toBe(true);
  });

  it("returns false when GitHub responds 404", async () => {
    const err = Object.assign(new Error("Not Found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValueOnce(err);
    const result = await github.repoExists("no", "repo");
    expect(result).toBe(false);
  });

  it("throws RateLimitError on GitHub 429", async () => {
    const err = Object.assign(new Error("Rate limited"), {
      isAxiosError: true,
      response: {
        status: 429,
        headers: { "x-ratelimit-reset": "9999999999" },
      },
    });
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValueOnce(err);
    await expect(github.repoExists("a", "b")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("uses Redis cache on cache hit and skips HTTP call", async () => {
    const fakeRedis = {
      get: jest.fn().mockResolvedValueOnce("true"),
      setex: jest.fn(),
    } as unknown as Redis;
    redisService.setRedisClient(fakeRedis);

    const result = await github.repoExists("golang", "go");
    expect(result).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("continues without cache when Redis is unavailable", async () => {
    const fakeRedis = {
      get: jest.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
      setex: jest.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")),
    } as unknown as Redis;
    redisService.setRedisClient(fakeRedis);
    mockGet.mockResolvedValueOnce({ status: 200, data: {} });

    const result = await github.repoExists("golang", "go");
    expect(result).toBe(true);
  });
});

describe("getLatestRelease", () => {
  it("returns release data on 200", async () => {
    const release = {
      tag_name: "v1.0",
      name: "Release 1.0",
      html_url: "http://...",
      published_at: "",
    };
    mockGet.mockResolvedValueOnce({ data: release });
    const result = await github.getLatestRelease("golang", "go");
    expect(result).toEqual(release);
  });

  it("returns null when no releases (GitHub 404)", async () => {
    const err = Object.assign(new Error("Not Found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValueOnce(err);
    const result = await github.getLatestRelease("empty", "repo");
    expect(result).toBeNull();
  });

  it("throws RateLimitError on 429", async () => {
    const err = Object.assign(new Error("Rate limited"), {
      isAxiosError: true,
      response: { status: 429, headers: {} },
    });
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValueOnce(err);
    await expect(github.getLatestRelease("a", "b")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
});
