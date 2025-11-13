import { useState } from 'react';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (Math.PI / 180) * (angleDeg - 90);
    const result = {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };

    console.log(result);

    return result;
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    const result = [
        'M', start.x, start.y,
        'A', r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');

    console.log(result);

    return result;
}

export default function PhysicalArc() {
    const [value, setValue] = useState(3);

    // Arco de 90°: inicia em 135° (canto inferior esquerdo) e vai até 45° (canto superior direito).
    const startAngle = 180;
    const endAngle = 45;
    // Mapeia o valor (1 a 5) para o intervalo de 135° a 45°.
    const angle = startAngle - ((value - 1) * (startAngle - endAngle) / 4);

    const cx = 100, cy = 100, r = 80;
    const pathBG = arcPath(cx, cy, r, startAngle, endAngle); // Arco de fundo
    const pathFG = arcPath(cx, cy, r, startAngle, angle);    // Arco preenchido
    const handlePos = polarToCartesian(cx, cy, r, angle);    // Posição do "botão"

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <h1 className="text-lg font-bold">Vamos te conhecer melhor</h1>
            <p className="mb-4">Como você se enxerga hoje?</p>

            <div className="relative w-[200px] h-[200px]">
                <svg width="200" height="200">
                    {/* Arco de fundo */}
                    <path d={pathBG} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    {/* Arco preenchido */}
                    <path d={pathFG} fill="none" stroke="#3b82f6" strokeWidth="8" />
                    {/* Botão móvel */}
                    <circle cx={handlePos.x} cy={handlePos.y} r="10" fill="#3b82f6" />
                </svg>

                {/* Valor no centro */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-semibold">{value}</span>
                </div>
            </div>

            <input
                type="range"
                min="1"
                max="5"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="mt-4 w-52"
            />
        </div>
    );
}
