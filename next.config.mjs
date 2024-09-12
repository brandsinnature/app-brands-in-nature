/** @type {import('next').NextConfig} */
import CopyPlugin from "copy-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(
                            __dirname,
                            "node_modules/scandit-web-datacapture-core/build/engine"
                        ),
                        to: path.resolve(__dirname, "public/library/engine"),
                    },
                    {
                        from: path.resolve(
                            __dirname,
                            "node_modules/scandit-web-datacapture-barcode/build/engine"
                        ),
                        to: path.resolve(__dirname, "public/library/engine"),
                    },
                ],
            })
        );

        return config;
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                ],
            },
        ];
    },
};

export default nextConfig;
