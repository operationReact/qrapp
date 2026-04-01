import PropTypes from 'prop-types';

export default function CategoryTabs({ categories, active, onChange }) {
    return (
        <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 py-2 px-1">

                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => onChange(cat)}
                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
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
