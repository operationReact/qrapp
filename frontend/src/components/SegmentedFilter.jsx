import PropTypes from 'prop-types';

export default function SegmentedFilter({ value, onChange }) {
    const options = ["all", "veg", "nonveg"];

    return (
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
            {options.map((opt) => (
                <button
                    key={opt}
                    role="tab"
                    aria-selected={value === opt}
                    onClick={() => onChange(opt)}
                    className={`px-4 py-2 rounded-full text-sm capitalize focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300 transition-all ${
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
