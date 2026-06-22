/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // This project lives on an external drive where atomic file renames can
    // fail, which breaks Next's on-disk webpack cache (ENOENT ... rename
    // .pack.gz). Use an in-memory cache in dev to avoid those errors.
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
