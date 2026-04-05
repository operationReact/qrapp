import PropTypes from 'prop-types';

export default function CategoryTabs({ categories, active, onChange }) {
    return (
        <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 py-1 px-0.5">

                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => onChange(cat)}
                        className={`min-h-[42px] whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                            active === cat
                                ? "bg-red-500 text-white shadow"
                                : "bg-gray-100 text-gray-700"
                        }`}
                    >
                        {cat}
                    </button>
                ))}

            </div>
        </div>
    );
}

CategoryTabs.propTypes = {
    categories: PropTypes.array.isRequired,
    active: PropTypes.string,
    onChange: PropTypes.func.isRequired,
};
