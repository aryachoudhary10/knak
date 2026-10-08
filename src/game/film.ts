/**
 * Film mode (?film): KNAK as a short vertical film for Reels. The camera follows a scripted glide instead of the
 * guest, nothing is drawn over the picture, and time only moves when a recorder steps it frame by frame, so even a
 * slow machine renders a smooth 30 fps clip.
 */
export const FILM = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("film");

/** Length of the film in seconds. */
export const FILM_SECONDS = 16;
