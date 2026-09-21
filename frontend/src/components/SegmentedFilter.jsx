import PropTypes from 'prop-types';

const options = ["all", "veg", "nonveg"];

const optionLabel = (opt) => (opt === 'veg' ? 'Veg' : opt === 'nonveg' ? 'Non-Veg' : 'All');

const dotColor = {
    veg: "bg-emerald-500",
    nonveg: "bg-orange-500",
};

export default function SegmentedFilter({ value, onChange, compact = false }) {
    if (compact) {
        return (
            <div
                role="tablist"
                aria-label="Veg / Non-Veg filter"
                className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto"
            >
                {options.map((opt) => {
                    const isActive = value === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChange(opt)}
                            className={`touch-manipulation flex h-9 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12px] font-semibold capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                isActive
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border/80 bg-card text-foreground hover:bg-muted"
                            }`}
                        >
                            {opt !== "all" && (
                                <span
                                    className={`size-2 shrink-0 rounded-full ${dotColor[opt]} ${isActive ? "ring-2 ring-white/60" : ""}`}
                                    aria-hidden="true"
                                />
                            )}
                            {optionLabel(opt)}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="inline-flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm md:gap-2 md:rounded-2xl md:p-1.5">
            {options.map((opt) => (
                <button
                    key={opt}
                    role="tab"
                    aria-selected={value === opt}
                    onClick={() => onChange(opt)}
                    className={`touch-manipulation min-h-9 flex-1 rounded-lg px-2 py-1 text-[12px] font-semibold capitalize transition-all focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:flex-none md:min-h-10 md:rounded-full md:px-3 md:py-1.5 md:text-sm ${
                        value === opt
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                    {optionLabel(opt)}
                </button>
            ))}
        </div>
    );
}

SegmentedFilter.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    compact: PropTypes.bool,
};
