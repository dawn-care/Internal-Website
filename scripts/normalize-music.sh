#!/usr/bin/env bash
# Prepares background music for Sunset Acres (/retirement).
#
#   scripts/normalize-music.sh retirement/sounds/some-track.mp3 retirement/music/some-track.mp3
#
# Two-pass EBU R128 loudness normalization to -18 LUFS (true peak -1.5 dBTP), 4-second fade
# in and out, metadata stripped, 44.1 kHz 128 kbps MP3. Every file in retirement/music is
# picked up by the game's playlist automatically. Needs ffmpeg.
set -euo pipefail
in="$1"
out="$2"
FADE=4
LOUDNORM="I=-18:TP=-1.5:LRA=11"

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
fade_out_at=$(awk -v d="$dur" -v f="$FADE" 'BEGIN { print d - f }')
stats=$(ffmpeg -hide_banner -nostats -i "$in" -af "loudnorm=$LOUDNORM:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }

ffmpeg -hide_banner -loglevel error -y -i "$in" -map_metadata -1 -vn \
  -af "loudnorm=$LOUDNORM:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=44100,afade=t=in:st=0:d=$FADE,afade=t=out:st=$fade_out_at:d=$FADE" \
  -c:a libmp3lame -b:a 128k "$out"
