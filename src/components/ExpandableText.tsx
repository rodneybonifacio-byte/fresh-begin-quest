import { useState } from "react";

interface ExpandableTextProps {
    text?: string;
}



export const ExpandableText: React.FC<ExpandableTextProps> = ({ text = "" }) => {
    const CHUNK_SIZE = 250; // Tamanho do bloco
    const [visibleLength, setVisibleLength] = useState(CHUNK_SIZE);

    const handleShowMore = () => {
        setVisibleLength((prev) => prev + CHUNK_SIZE);
    };

    const isFullyVisible = visibleLength >= text.length;

    return (
        <div>
            <p>{text.slice(0, visibleLength)}</p>
            {!isFullyVisible && text.length > 0 && (
                <button onClick={handleShowMore} style={{ color: "blue", border: "none", background: "none", cursor: "pointer" }}>
                    ...mais
                </button>
            )}
        </div>
    );
};
