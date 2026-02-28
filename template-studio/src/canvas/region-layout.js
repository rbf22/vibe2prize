const IMAGE_REGION_PADDING = '0.4rem';
const DATA_TABLE_PADDING = '0.45rem';
const DEFAULT_TEXT_VERTICAL_PADDING = 18; // px cap
const DEFAULT_TEXT_HORIZONTAL_PADDING = 24; // px cap

export function getRegionFrameStyle(theme, { variant = 'preview' } = {}) {
  const base = {
    borderRadius: '0.2rem',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'flex-start'
  };

  if (variant === 'production') {
    return {
      ...base,
      border: 'none',
      backgroundColor: 'transparent',
      backdropFilter: 'none',
      gap: 0,
      transition: 'none'
    };
  }

  const isLight = theme === 'light';
  return {
    ...base,
    // Keep a real 1px border in preview so spacing matches production even if the
    // color is later set to transparent. Removing the border collapses logo/image
    // regions and causes measurable diffs versus the production renderer.
    border: '1px solid transparent',
    backdropFilter: 'blur(4px)',
    backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.35)',
    gap: '0.35rem',
    transition: 'opacity 0.2s ease'
  };
}

export function calculateRegionPadding({
  role,
  inputType,
  regionWidth,
  regionHeight,
  isImageRole
} = {}) {
  const isImage = inputType === 'image' || isImageRole;
  if (isImage) {
    return role === 'logo' ? '0px' : IMAGE_REGION_PADDING;
  }
  if (role === 'data-table') {
    return DATA_TABLE_PADDING;
  }
  const safeWidth = Math.max(Number(regionWidth) || 0, 0);
  const safeHeight = Math.max(Number(regionHeight) || 0, 0);
  if (safeWidth === 0 || safeHeight === 0) {
    return `${DEFAULT_TEXT_VERTICAL_PADDING}px ${DEFAULT_TEXT_HORIZONTAL_PADDING}px`;
  }
  const verticalPadding = Math.min(safeHeight * 0.25, DEFAULT_TEXT_VERTICAL_PADDING);
  const horizontalPadding = Math.min(safeWidth * 0.08, DEFAULT_TEXT_HORIZONTAL_PADDING);
  return `${verticalPadding}px ${horizontalPadding}px`;
}

export { IMAGE_REGION_PADDING, DATA_TABLE_PADDING };
