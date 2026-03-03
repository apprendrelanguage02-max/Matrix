import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";

/**
 * Reusable like button for properties and articles.
 * @param {string} type - "property" | "article"
 * @param {string} id - entity ID
 * @param {number} initialCount - initial likes count
 * @param {string[]} initialLikedBy - array of user IDs who liked
 * @param {string} [className] - extra tailwind classes for the wrapper
 */
export default function LikeButton({ type, id, initialCount = 0, initialLikedBy = [], className = "" }) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [likedBy, setLikedBy] = useState(initialLikedBy);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(false);

  const isLiked = user ? likedBy.includes(user.id) : false;

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.info("Connectez-vous pour liker");
      return;
    }
    if (loading) return;

    // Optimistic update
    const wasLiked = isLiked;
    setLikedBy((prev) =>
      wasLiked ? prev.filter((uid) => uid !== user.id) : [...prev, user.id]
    );
    setCount((c) => (wasLiked ? c - 1 : c + 1));
    if (!wasLiked) setBurst(true);
    setTimeout(() => setBurst(false), 600);

    setLoading(true);
    try {
      const endpoint = type === "property"
        ? `/properties/${id}/like`
        : `/articles/${id}/like`;
      const res = await api.post(endpoint);
      // Sync with server truth
      setCount(res.data.likes_count);
      setLikedBy(res.data.liked_by);
    } catch {
      // Rollback on error
      setLikedBy((prev) =>
        wasLiked ? [...prev, user.id] : prev.filter((uid) => uid !== user.id)
      );
      setCount((c) => (wasLiked ? c + 1 : c - 1));
      toast.error("Erreur, réessayez");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      data-testid={`like-btn-${type}-${id}`}
      title={isLiked ? "Retirer le like" : "J'aime"}
      className={`group flex items-center gap-1.5 transition-all duration-200 ${className}`}
    >
      <span
        className={`relative transition-all duration-200 ${burst ? "scale-125" : "scale-100"}`}
        style={{ display: "inline-flex" }}
      >
        <Heart
          className={`w-4 h-4 transition-all duration-200 ${
            isLiked
              ? "fill-red-500 text-red-500"
              : "text-zinc-400 group-hover:text-red-400"
          } ${burst ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : ""}`}
        />
      </span>
      {count > 0 && (
        <span
          data-testid={`like-count-${type}-${id}`}
          className={`text-xs font-bold transition-colors duration-200 ${
            isLiked ? "text-red-500" : "text-zinc-400 group-hover:text-red-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
