/**
 * Film mode (?film): KNAK as a short vertical film for Reels. The camera follows a scripted glide instead of the
 * guest, nothing is drawn over the picture, and time only moves when a recorder steps it frame by frame, so even a
 * slow machine renders a smooth 30 fps clip.
 */
const param = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("film") : null;
export const FILM = param !== null;

/**
 * ?film=tour is the longer feature reel: the walk in, a greeting by name, the room, the counter, a table shared with
 * another guest, the waiter bringing word of the order, and the bar salon. Its menu, payment and chat screens are
 * filmed separately and cut in between these shots.
 */
export const FILM_TOUR = param === "tour";

/** Length of the film in seconds. */
export const FILM_SECONDS = FILM_TOUR ? 31 : 16;
