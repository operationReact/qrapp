import PropTypes from 'prop-types';

export default function ConfirmDialog({ title = 'Confirm', message, onCancel, onConfirm, pending }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-4">{message}</p>

                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-3 py-2 bg-gray-100 rounded">Cancel</button>
                    <button onClick={onConfirm} disabled={pending} className="px-3 py-2 bg-red-500 text-white rounded">{pending ? 'Deleting...' : 'Delete'}</button>
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

