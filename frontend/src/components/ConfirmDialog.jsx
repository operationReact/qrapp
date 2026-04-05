import PropTypes from 'prop-types';

export default function ConfirmDialog({ title = 'Confirm', message, onCancel, onConfirm, pending }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-xl sm:p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mb-5 text-sm text-gray-600">{message}</p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button onClick={onCancel} className="touch-button rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">Cancel</button>
                    <button onClick={onConfirm} disabled={pending} className="touch-button rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white">{pending ? 'Deleting...' : 'Delete'}</button>
                </div>
            </div>
        </div>
    );
}

ConfirmDialog.propTypes = {
    title: PropTypes.string,
    message: PropTypes.string,
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    pending: PropTypes.bool
};

