import { useEffect, useState, useCallback } from "react";
import { getMenu } from "../services/api";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import CategoryTabs from "../components/CategoryTabs";
import SegmentedFilter from "../components/SegmentedFilter";
import MenuItemCard from "../components/MenuItemCard";

// Small mock dataset used when backend is unreachable so the UI can be inspected
const SAMPLE_MENU = [
    { id: 1, name: 'Paneer Butter Masala', price: 220, category: 'Main', description: 'Rich tomato gravy', imageUrl: null, isVeg: true },
    { id: 2, name: 'Chicken Biryani', price: 250, category: 'Main', description: 'Fragrant basmati biryani', imageUrl: null, isVeg: false },
    { id: 3, name: 'Veg Salad', price: 120, category: 'Sides', description: 'Fresh greens', imageUrl: null, isVeg: true }
];

export default function Menu() {
    const [menu, setMenu] = useState([]);
    const [category, setCategory] = useState("All");
    const [vegFilter, setVegFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [offline, setOffline] = useState(false);
    const [offlineMessage, setOfflineMessage] = useState('');

    const fetchMenu = useCallback(async () => {
        setLoading(true);
        const opts = {};
        if (vegFilter === 'veg') opts.isVeg = true;
        if (vegFilter === 'nonveg') opts.isVeg = false;
        try {
            const res = await getMenu(opts);
            setMenu(res.data || []);
            setOffline(false);
            setOfflineMessage('');
        } catch (err) {
            console.error('Failed to fetch /menu:', err && err.message ? err.message : err);
            setMenu(SAMPLE_MENU);
            setOffline(true);
            const status = err && err.response && err.response.status;
            const statusText = err && err.response && err.response.statusText;
            const code = err && err.code;
            const msg = err && err.message;
            const composed = status ? `${status} ${statusText || ''}` : (code || msg || 'Network error');
            setOfflineMessage(String(composed));
        } finally {
            setLoading(false);
        }
    }, [vegFilter]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const categories = ["All", ...new Set(menu.map((m) => m.category))];

    const filtered = menu.filter((item) => {
        // Normalize possible server representations for boolean-ish isVeg
        const isVeg = item.isVeg === true || item.isVeg === 'true' || item.isVeg === 1 || item.isVeg === '1';
        const haystack = [item.name, item.description, item.category, item.tag].filter(Boolean).join(' ').toLowerCase();
        if (category !== "All" && item.category !== category) return false;
        if (vegFilter === "veg" && !isVeg) return false;
        if (vegFilter === "nonveg" && isVeg) return false;
        if (searchQuery.trim() && !haystack.includes(searchQuery.trim().toLowerCase())) return false;
        return true;
    });

    return (
        <div className="page-shell bg-[#f8fafc]">

            <Navbar />

            {/* Backend offline banner (non-technical user friendly) */}
            {offline && (
                <div className="container-premium py-3">
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        Backend unreachable — frontend is using local sample data. Start the backend to use live data.
                        <div className="mt-2 overflow-x-auto rounded-xl bg-white p-2 font-mono text-xs">cd backend; ./gradlew bootRun (or gradle bootRun)</div>
                        {offlineMessage && (
                            <div className="mt-2 text-xs text-red-600">{offlineMessage}</div>
                        )}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button onClick={fetchMenu} className="touch-button rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white">Retry</button>
                            <button onClick={() => { setMenu(SAMPLE_MENU); setOffline(true); setOfflineMessage('Using local sample data'); }} className="touch-button rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Use sample data</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="sticky top-[var(--app-header-height)] z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                <div className="container-premium py-3">
                    <div className="space-y-3">
                        <SearchBar onSearch={setSearchQuery} />
                        <div className="space-y-3 rounded-[1.5rem] border border-gray-100 bg-gray-50/70 p-3">
                            <SegmentedFilter value={vegFilter} onChange={setVegFilter} />
                            <CategoryTabs
                                categories={categories}
                                active={category}
                                onChange={setCategory}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="container-premium py-5 sm:py-6">
                <div className="page-stack">

                {/* HEADER */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Menu</h1>
                    <p className="text-gray-500 text-sm">
                        Browse and order directly from your table
                    </p>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {filtered.length} item{filtered.length === 1 ? '' : 's'} shown
                    </div>
                </div>

                {/* LOADING */}
                {loading && <p className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-500 shadow-sm">Loading menu...</p>}

                {/* EMPTY */}
                {!loading && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white py-20 text-gray-400 shadow-sm">
                        <div className="text-5xl mb-3">🍽</div>
                        <p className="text-lg">No items found</p>
                        <p className="text-sm">Try changing filters</p>
                    </div>
                )}

                {/* ITEMS */}
                <div className="premium-grid">
                    {filtered.map((item) => (
                        <MenuItemCard key={item.id} item={item} />
                    ))}
                </div>

                </div>
             </main>
         </div>
     );
 }
