import PropTypes from 'prop-types';

export default function SegmentedFilter({ value, onChange }) {
    const options = ["all", "veg", "nonveg"];

    return (
        <div className="inline-flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
            {options.map((opt) => (
                <button
                    key={opt}
                    role="tab"
                    aria-selected={value === opt}
                    onClick={() => onChange(opt)}
                    className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-semibold capitalize transition-all focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:flex-none ${
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
