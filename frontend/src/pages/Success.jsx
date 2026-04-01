export default function Success() {
    return (
        <div className="min-h-screen bg-page flex items-center justify-center p-8">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Order Placed Successfully</h2>
                <p className="text-gray-600 mb-4">Thanks for ordering — we’re preparing your food!</p>
                <a href="/" className="inline-block bg-brand-500 text-white px-4 py-2 rounded">Back to menu</a>
            </div>
        </div>
    );
}