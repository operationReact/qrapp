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
        if (category !== "All" && item.category !== category) return false;
        if (vegFilter === "veg" && !isVeg) return false;
        if (vegFilter === "nonveg" && isVeg) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#f8fafc]">

            <Navbar />

            {/* Backend offline banner (non-technical user friendly) */}
            {offline && (
                <div className="container-premium py-3">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm">
                        Backend unreachable — frontend is using local sample data. Start the backend to use live data.
                        <div className="mt-2 font-mono text-xs bg-white p-2 rounded">cd backend; .\mvnw.cmd spring-boot:run</div>
                        {offlineMessage && (
                            <div className="mt-2 text-xs text-red-600">{offlineMessage}</div>
                        )}
                        <div className="mt-2 flex gap-2">
                            <button onClick={fetchMenu} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Retry</button>
                            <button onClick={() => { setMenu(SAMPLE_MENU); setOffline(true); setOfflineMessage('Using local sample data'); }} className="px-3 py-1 bg-gray-100 rounded text-sm">Use sample data</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 SEARCH SECTION */}
            <div className="bg-white sticky top-[64px] z-40 border-b border-gray-200">
                <div className="container-premium px-0 py-3">
                    <SearchBar />
                </div>
            </div>

            <main className="container-premium py-6 space-y-6">

                {/* HEADER */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Menu</h1>
                    <p className="text-gray-500 text-sm">
                        Browse and order directly from your table
                    </p>
                </div>

                {/* 🔥 FILTER + CATEGORY */}
                <div className="sticky top-[120px] z-30 bg-white border-b border-gray-200 py-3 space-y-3">

                    <div className="flex items-center justify-between gap-3">
                        <SegmentedFilter value={vegFilter} onChange={setVegFilter} />
                        <div className="flex-1 ml-4">
                            <CategoryTabs
                                categories={categories}
                                active={category}
                                onChange={setCategory}
                            />
                        </div>
                    </div>

                </div>

                {/* LOADING */}
                {loading && <p>Loading...</p>}

                {/* EMPTY */}
                {!loading && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
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

             </main>
         </div>
     );
 }
