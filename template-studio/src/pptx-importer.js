export function mapPptxToGrid(pptxData) {
  // Simplified logic to map PPTX shapes to our 80x45 grid
  // In a full implementation, this would parse the XML/JSON from a PPTX parser
  return pptxData.slides.map(slide => {
    return {
      name: slide.title || "Imported Slide",
      regions: slide.shapes.map(shape => ({
        id: Math.random().toString(36).substr(2, 9),
        name: shape.type,
        x: Math.floor((shape.x / 100) * 80),
        y: Math.floor((shape.y / 100) * 45),
        w: Math.max(4, Math.floor((shape.w / 100) * 80)),
        h: Math.max(2, Math.floor((shape.h / 100) * 45)),
        content: shape.text || "",
        role: shape.type === 'title' ? 'header' : 'content'
      }))
    };
  });
}
