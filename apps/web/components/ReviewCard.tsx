import { useEffect, useRef, useState } from "react";
import { ThumbsUp, ThumbsDown, MapPin, Clock, User, Star } from "lucide-react";

interface ReviewCardProps {
    review: {
        author: string;
        rating: number;
        artist: string;
        venue: string;
        city: string;
        state: string;
        content: string;
        createdAt: string;
        upvotes: number;
        downvotes: number;
    };
}

export default function ReviewCard({ review }: ReviewCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [showButton, setShowButton] = useState(false);

    const [vote, setVote] = useState<"up" | "down" | null>(null);
    const [upvotes, setUpvotes] = useState(review.upvotes);
    const [downvotes, setDownvotes] = useState(review.downvotes);

    const contentRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const checkOverflow = () => {
            if (!contentRef.current) return;

            // Wait for the browser to apply the clamp
            requestAnimationFrame(() => {
                const el = contentRef.current!;
                setShowButton(el.scrollHeight > el.clientHeight);
            });
        };

        checkOverflow();

        window.addEventListener("resize", checkOverflow);
        return () => window.removeEventListener("resize", checkOverflow);
    }, [review.content]);

    const handleVote = (type: "up" | "down") => {
        if (type === "up") {
            if (vote === "up") {
                setVote(null);
                setUpvotes((prev) => prev - 1);
            } else if (vote === "down") {
                setVote("up");
                setUpvotes((prev) => prev + 1);
                setDownvotes((prev) => prev - 1)
            } else {
                setVote("up");
                setUpvotes((prev) => prev + 1);
            }
        }

        if (type === "down") {
            if (vote === "down") {
                setVote(null);
                setDownvotes((prev) => prev - 1);
            } else if (vote === "up") {
                setVote("down");
                setDownvotes((prev) => prev + 1);
                setUpvotes((prev) => prev - 1);
            } else {
                setVote("down");
                setDownvotes((prev) => prev + 1);
            }
        }
    };

    return (
        <article className="rounded-xl border border-review-border bg-review-background p-6 shadow-sm">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, index) => (
                        <Star
                            key={index}
                            size={18}
                            className={
                                index < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-none text-gray-300"
                            }
                        />
                    ))}

                    <span className="text-sm font-medium text-gray-600">
                        {review.rating}/5
                    </span>
                </div>
                
                <div className="flex items-center text-sm text-review-muted">
                    <Clock className="mr-1 h-4 w-4" />
                    {review.createdAt}
                </div>
            </div>

            {/* Event Info */}
            <div className="mb-4 border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">
                    {review.artist}
                </h2>

                <div className="mt-1 flex items-center gap-1 text-sm text-review-muted">
                    <MapPin size={14} />
                    <span>
                        {review.venue} · {review.city}, {review.state}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
               <p 
                   ref={contentRef}
                   className={`
                    text-review-foreground overflow-hidden min-h-[7lh] sm:min-h-[5lh]
                    ${expanded 
                        ? '' 
                        : "line-clamp-7 sm:line-clamp-5"}
                    `}
               >
                   {review.content}
               </p>

               {showButton && (
                    <button
                        onClick={() => setExpanded((prev) => !prev)}
                     className="mt-2 text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                   >
                        {expanded ? 'Show less' : 'Show more'}
                   </button>
               )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-review-muted">
                    <User size={18} />
                    <span>{review.author}</span>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => handleVote("up")}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                            vote === "up"
                                ? "border-green-500 bg-green-50 text-green-600"
                                : "text-review-muted hover:bg-gray-100"
                        }`}
                    >
                        <ThumbsUp size={18} />
                        {upvotes}
                    </button>

                    <button 
                        onClick={() => handleVote("down")}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                            vote === "down"
                                ? "border-red-500 bg-red-50 text-red-600"
                                : "text-review-muted hover:gb-gray-100"
                        }`}
                    >
                        <ThumbsDown size={18} />
                        {downvotes}
                    </button>
                </div>
            </div>
        </article>
    )
}