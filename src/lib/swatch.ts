// Swatch rendering utilities.
//
// A color option can be:
//   - single color: { color }
//   - bicolor: { color, color2 }  → rendered as diagonal split
//   - textured/image: { swatchImage } → rendered as a covered image
//
// Priority: swatchImage > color2 (bicolor) > color (single).

export interface SwatchLike {
  color?: string;
  color2?: string | null;
  swatchImage?: string | null;
  image?: string;
}

export function getSwatchStyle(opt: SwatchLike | undefined | null): React.CSSProperties {
  if (!opt) return { backgroundColor: "#888" };
  if (opt.swatchImage) {
    return {
      backgroundImage: `url(${opt.swatchImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (opt.color2) {
    // diagonal split: top-left = color, bottom-right = color2
    return {
      backgroundImage: `linear-gradient(135deg, ${opt.color || "#000"} 0 50%, ${opt.color2} 50% 100%)`,
    };
  }
  return { backgroundColor: opt.color || "#888" };
}

export function isBicolor(opt: SwatchLike | undefined | null): boolean {
  return !!(opt && opt.color2 && !opt.swatchImage);
}

export function hasSwatchImage(opt: SwatchLike | undefined | null): boolean {
  return !!(opt && opt.swatchImage);
}
