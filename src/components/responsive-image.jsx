import images from "@/image-manifest.json";

// Unknown/admin-provided URLs retain their original source and error handling.
export default function ResponsiveImage({ src, alt, sizes = "100vw", loading = "lazy", ...props }) {
  const image = images[src];
  const fallback = image?.variants.find((variant) => variant.width >= 640) || image?.variants.at(-1);
  return <img
    decoding="async"
    loading={loading}
    width={image?.width}
    height={image?.height}
    src={fallback?.src || src}
    srcSet={image?.variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ")}
    sizes={image ? sizes : undefined}
    alt={alt}
    {...props}
  />;
}
