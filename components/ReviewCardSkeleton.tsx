export default function ReviewCardSkeleton() {
    return (
        <article className="rounded-xl border border-review-border bg-review-background p-6 shadow-sm animate-pulse">
            {/* Rating + Date */}
            <div className="mb-4 flex justify-between">
                <div className="h-5 w-28 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
            </div>

            {/* Event info */}
            <div className="mb-4 border-b pb-4">
                <div className="h-6 w-48 rounded bg-gray-200" />

                <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
            </div>

            {/* Review text */}
            <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="h-4 w-32 rounded bg-gray-200" />

                <div className="flex gap-3">
                    <div className="h-9 w-20 rounded-lg bg-gray-200" />
                    <div className="h-9 w-20 rounded-lg bg-gray-200" />
                </div>
            </div>
        </article>
    );
}