interface ChartTooltipItem {
    label: string;
    value: string | number;
    icon?: string;
    strong?: boolean;
}

interface ChartTooltipOptions {
    title: string;
    items: ChartTooltipItem[];
}

export function ChartTooltipBuilder({ title, items }: ChartTooltipOptions): string {
    return `
    <div class="rounded-xl bg-white shadow-md border border-slate-200 p-4 text-sm space-y-1 cursor-pointer min-w-[220px]">
      <div class="font-semibold text-slate-800">${title}</div>
      ${items
            .map((item) => `
                    <div class="text-slate-600">
                        ${item.icon || ''} <span class="font-medium">${item.label}:</span> ${item.strong
                    ? `<strong>${item.value}</strong>`
                    : `${item.value}`
                }
                    </div>
        `
            )
            .join('')}
    </div>
  `;
}
