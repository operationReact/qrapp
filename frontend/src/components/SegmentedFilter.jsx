import PropTypes from 'prop-types';

export default function SegmentedFilter({ value, onChange }) {
    const options = ["all", "veg", "nonveg"];

    return (
        <div className="inline-flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm md:gap-2 md:rounded-2xl md:p-1.5">
            {options.map((opt) => (
                <button
                    key={opt}
                    role="tab"
                    aria-selected={value === opt}
                    onClick={() => onChange(opt)}
                    className={`min-h-9 flex-1 rounded-lg px-2 py-1 text-[13px] font-semibold capitalize transition-all focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:flex-none md:min-h-11 md:rounded-full md:px-3 md:py-2 md:text-sm ${
                        value === opt
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                    {opt === 'veg' ? 'Veg' : (opt === 'nonveg' ? 'Non-Veg' : 'All')}
                </button>
            ))}
        </div>
    );
}

SegmentedFilter.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};
