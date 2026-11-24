/**
 * 四角水印：淡淡的「财神」字样，88px，固定在页面四角，不拦截交互。
 */
const CORNERS = [
  'wm-top-left',
  'wm-top-right',
  'wm-bottom-left',
  'wm-bottom-right',
];

/**
 * 水印层组件。
 */
const Watermark = () => (
  <div className="watermark-layer" aria-hidden="true">
    {CORNERS.map((corner) => (
      <span key={corner} className={`watermark-char ${corner}`}>
        财神
      </span>
    ))}
  </div>
);

export default Watermark;
