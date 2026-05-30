import "./Skeleton.css";

export default function Skeleton({ type = "row", count = 5 }) {
  const renderSkeleton = () => {
    if (type === "row") {
      return (
        <div className="skeleton-row-container">
          {Array(count).fill(0).map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-item sk-check"></div>
              <div className="skeleton-item sk-code"></div>
              <div className="skeleton-item sk-name"></div>
              <div className="skeleton-item sk-category"></div>
              <div className="skeleton-item sk-price"></div>
              <div className="skeleton-item sk-stock"></div>
              <div className="skeleton-item sk-btns"></div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return <>{renderSkeleton()}</>;
}
