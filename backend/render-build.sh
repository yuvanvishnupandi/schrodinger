#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "========================================="
echo " Installing system dependencies (FFmpeg) "
echo "========================================="
curl -L -O https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
mkdir -p ~/.local/bin
cp ffmpeg-*-amd64-static/ffmpeg ~/.local/bin/
cp ffmpeg-*-amd64-static/ffprobe ~/.local/bin/
rm -rf ffmpeg-*-amd64-static*
echo "FFmpeg installed successfully."

echo "========================================="
echo " Installing Python dependencies          "
echo "========================================="
pip install --upgrade pip
pip install -r requirements.txt
echo "Dependencies installed successfully."
