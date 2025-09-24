export default function BouncingShapesThumb({ color = '#ff6b6b' }: { color?: string }) {
    return (
        <svg width="250" height="120" viewBox="0 0 250 120" fill="none" aria-hidden="true">
            <circle cx="50" cy="60" r="20" fill={color} className="anim-bob-slow" />
            <rect x="105" y="50" width="40" height="40" fill={color} className="anim-tilt" />
            <polygon points="195,45 220,75 170,75" fill={color} className="anim-bob-fast" />
        </svg>
    );
}