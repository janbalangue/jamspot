'use client';

import { useState } from "react";
import ReviewCard from "@/components/ReviewCard";

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
    const [search, setSearch] = useState("");

    const filteredReviews = mockReviews.filter((review) => {
        const query = search.toLowerCase().trim();

        if (!query) return true;

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

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6 text-foreground">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold">Reviews</h1>

                <input 
                    type="text"
                    placeholder="Search by artist, venue, or location..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setSearch(searchInput);
                        }
                    }}
                    className=" 
                        w-full sm:w-96 rounded-lg 
                        border border-review-border 
                        bg-review-background 
                        px-4 py-2 
                        text-sm text-review-foreground
                        outline-none 
                        focus:border-primary 
                        focus:ring-1 focus:ring-primary"
                    /> 
            </div>

            <div className="space-y-4">
                {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500">
                        No reviews found.
                    </p>
                )}
            </div>
        </main>
    )
}