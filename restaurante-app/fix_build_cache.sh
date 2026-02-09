#!/bin/bash
echo "Stopping Gradle Daemons..."
./android/gradlew --stop

echo "Removing specific Gradle version caches..."
rm -rf ~/.gradle/caches/8.14.3
rm -rf ~/.gradle/caches/jars-9
rm -rf ~/.gradle/daemon

echo "Removing project local Gradle caches..."
rm -rf .gradle
rm -rf android/.gradle
rm -rf android/build

echo "Removing C++ build artifacts..."
rm -rf android/app/.cxx
rm -rf android/app/build

echo "Cleaning Android project..."
cd android
./gradlew clean --no-daemon
