#!/usr/bin/env bash
# Cuts a sound effect out of a recording and levels it for Sunset Acres (retirement/sfx).
#
#   scripts/cut-sfx.sh <in> <out.mp3> <start-seconds> <duration-seconds> [fade-out-ms] [mean-dB]
#
# Mono, 44.1 kHz, 96 kbps MP3, with a 4ms fade in and a fade out (default 60ms). The clip is
# levelled so its mean (RMS) volume is <mean-dB> (default -24, like the footsteps), but its peak
# never goes above -1 dBFS. Needs ffmpeg.
set -euo pipefail

in=$1
out=$2
start=$3
dur=$4
fade_ms=${5:-60}
target=${6:--24}

tmp=$(mktemp --suffix=.wav)
trap 'rm -f "$tmp"' EXIT

fade_s=$(awk -v ms="$fade_ms" 'BEGIN { printf "%.3f", ms / 1000 }')
fade_at=$(awk -v d="$dur" -v f="$fade_s" 'BEGIN { printf "%.3f", d - f }')
ffmpeg -v error -y -ss "$start" -t "$dur" -i "$in" -ac 1 -ar 44100 \
  -af "afade=t=in:d=0.004,afade=t=out:st=${fade_at}:d=${fade_s}" "$tmp"

stats=$(ffmpeg -v info -i "$tmp" -af volumedetect -f null - 2>&1)
mean=$(grep -o 'mean_volume: [-0-9.]*' <<<"$stats" | awk '{ print $2 }')
peak=$(grep -o 'max_volume: [-0-9.]*' <<<"$stats" | awk '{ print $2 }')
# Gain to reach the target mean, capped so the peak stays at or under -1 dBFS.
gain=$(awk -v t="$target" -v m="$mean" -v p="$peak" \
  'BEGIN { g = t - m; if (p + g > -1) g = -1 - p; printf "%.2f", g }')

ffmpeg -v error -y -i "$tmp" -af "volume=${gain}dB" -c:a libmp3lame -b:a 96k "$out"
echo "$out: mean ${mean} dB -> $(awk -v m="$mean" -v g="$gain" 'BEGIN { printf "%.1f", m + g }') dB (gain ${gain} dB, peak was ${peak} dB)"
