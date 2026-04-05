import PropTypes from 'prop-types';

export default function SegmentedFilter({ value, onChange }) {
    const options = ["all", "veg", "nonveg"];

    return (
        <div className="inline-flex w-full flex-wrap items-center gap-2 rounded-[1.25rem] bg-gray-100 p-1 sm:w-auto sm:flex-nowrap">
            {options.map((opt) => (
                <button
                    key={opt}
                    role="tab"
                    aria-selected={value === opt}
                    onClick={() => onChange(opt)}
                    className={`min-h-[42px] flex-1 rounded-full px-4 py-2 text-sm capitalize transition-all focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:flex-none ${
                        value === opt
                            ? "bg-white shadow text-black"
                            : "text-gray-600"
                    }`}
                >
                    {opt === 'veg' ? 'Veg' : (opt === 'nonveg' ? 'Nonveg' : 'All')}
                </button>
            ))}
        </div>
    );
}

SegmentedFilter.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};
