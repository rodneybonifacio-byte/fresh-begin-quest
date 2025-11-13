export interface ItemCheckboxSelected {
    label: string;
    value: string;
}

interface CustomCheckboxProps {
    item: ItemCheckboxSelected;
    checked: boolean;
    onSelected: (item: ItemCheckboxSelected, selected: boolean) => void;
}

export default function CustomCheckbox({ item, checked, onSelected }: CustomCheckboxProps) {
    const handleCheckboxChange = () => {
        onSelected(item, !checked);
    };

    return (
        <div className="flex items-center gap-1 cursor-pointer">
            <input
                type="checkbox"
                id={item.value}
                className={`
                    appearance-none
                    w-5 h-5
                    border-[1px]
                    border-secondary dark:border-secondary-dark
                    bg-[#F5EDFF] dark:bg-slate-700
                    rounded-md
                    cursor-pointer
                    focus:outline-none
                    focus:ring-0
                    relative
                    transition-all
                    before:content-['']
                    before:absolute
                    before:left-[6px]
                    before:top-[2px]
                    before:w-1.5
                    before:h-2.5
                    before:border-b-2
                    before:border-l-2
                    before:border-white
                    before:rotate-[-45deg]
                    before:origin-center
                    before:scale-0
                    checked:before:scale-100
                    checked:bg-secondary dark:checked:bg-secondary-dark
                    checked:border-secondary dark:checked:border-secondary-dark
                `}
                checked={checked}
                onChange={handleCheckboxChange}
            />
            <label htmlFor={item.value} className="ml-2 text-black dark:text-gray-100 cursor-pointer">
                {item.label}
            </label>
        </div>
    );
}
