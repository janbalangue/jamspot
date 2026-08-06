'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music2, Search } from "lucide-react";
import ReviewCard from "@/components/ReviewCard";
import ReviewCardSkeleton from "@/components/ReviewCardSkeleton";

export const mockReviews = [
  {
    id: "1",
    author: "Sarah Mitchell",
    rating: 4,
    artist: "Massive Attack",
    venue: "Golden 1 Center",
    city: "Sacramento",
    state: "CA",
    content: "Amazing performance. The visuals were incredible and the sound quality was one of the best I've experienced at a live show.",
    createdAt: "July 30, 2026",
    upvotes: 127,
    downvotes: 6,
  },
  {
  id: "2",
  author: "David Chen",
  rating: 3,
  artist: "The War on Drugs",
  venue: "Ace of Spades",
  city: "Sacramento",
  state: "CA",
  content:
    "The band sounded great and the atmosphere was energetic. The guitar work was incredible, and the crowd was really engaged throughout the night. The only downside was that the venue felt a little cramped and it was difficult to get a good view unless you arrived early.",
  createdAt: "July 28, 2026",
  upvotes: 54,
  downvotes: 3,
},
{
  id: "3",
  author: "Emily Rodriguez",
  rating: 5,
  artist: "Lana Del Rey",
  venue: "Golden Gate Park",
  city: "San Francisco",
  state: "CA",
  content:
    "One of the most memorable concerts I've ever attended. The vocals were beautiful, the stage design was stunning, and the entire performance felt like a cinematic experience. Everything from the lighting to the setlist was thoughtfully done.",
  createdAt: "July 24, 2026",
  upvotes: 201,
  downvotes: 9,
},
{
  id: "4",
  author: "Michael Thompson",
  rating: 4,
  artist: "Tame Impala",
  venue: "Chase Center",
  city: "San Francisco",
  state: "CA",
  content:
    "The visuals were absolutely amazing and matched the music perfectly. The sound quality was excellent, and the band delivered a great performance. The only issue was that the lines for drinks were extremely long during the show.",
  createdAt: "July 20, 2026",
  upvotes: 89,
  downvotes: 5,
},
{
  id: "5",
  author: "Olivia Martinez",
  rating: 4,
  artist: "Billie Eilish",
  venue: "Golden 1 Center",
  city: "Sacramento",
  state: "CA",
  content:
    "Fantastic show from start to finish. Billie had incredible stage presence, and the crowd energy made the experience even better. The production quality was on another level, with amazing lighting and visuals that made every song feel unique.",
  createdAt: "July 15, 2026",
  upvotes: 342,
  downvotes: 12,
},
];

export default function ReviewsPage() {
    const [searchInput, setSearchInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [reviews, setReviews] = useState<typeof mockReviews>([]);

    useEffect(() => {
        async function loadReviews() {
            setIsLoading(true);

            try {
                // Temporary mock data Replace this with API call later
                setReviews(mockReviews);
            } catch (error) {
                console.error("Failed to load reviews:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadReviews();
    }, []);

    const handleSearch = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsLoading(true);

        try {
            const query = searchInput.toLowerCase().trim();

            const filtered = mockReviews.filter((review) => {
                const searchableText = [
                    review.artist,
                    review.venue,
                    review.city,
                    review.state,
                    `${review.city}, ${review.state}`,
                ]
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            });
            setReviews(filtered);
        } catch (error) {
            console.error("Failed to search reviews:", error);
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Top row */}
                        <div className="flex items-center gap-6">
                            <Link
                                href="/"
                                className="flex items-center gap-2 shrink-0"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                                    <Music2 size={14} className="text-white" />
                                </div>

                                <span
                                    className="text-sm font-bold uppercase tracking-widest text-foreground"
                                    style={{
                                        fontFamily: "'Unbounded', sans-serif",
                                        letterSpacing: "0.12em",
                                    }}
                                >
                                    JAMSPOT
                                </span>
                            </Link>

                            {/* Active Page */}
                            <nav>
                                <Link
                                    href="/reviews-page"
                                    className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white"
                                >
                                    Reviews
                                </Link>
                            </nav>
                        </div>
                        
                        {/* Search */}
                        <form
                            onSubmit={handleSearch}
                            className="w-full sm:w-auto"
                        >
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 sm:w-96">
                                <Search size={15} className="text-muted-foreground shrink-0" />

                                <input 
                                    type="text"
                                    name="review-search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by artist, venue, or location..."
                                    className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                    /> 
                            </div>
                        </form>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl space-y-6 p-6 text-foreground">
                {/* Reviews heading */}
                <div className="flex items-baseline justify-between">
                    <h1
                        className="text-lg font-bold text-foreground"
                        style={{
                            fontFamily: "'Unbounded', sans-serif",
                            fontSize: "1rem",
                        }}
                    >
                        Reviews
                    </h1>

                    <span
                        className="text-sm text-muted-foreground"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                        {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Reviews Cards */}
                <div className="space-y-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <ReviewCardSkeleton key={index} />
                        ))
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                            />
                        ))
                    ) : (
                        <p className="text-center text-review-muted">
                            No reviews found.
                        </p>
                    )}
                </div>
            </main>
        </>
    )
}