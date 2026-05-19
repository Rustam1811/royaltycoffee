#!/usr/bin/env node
/**
 * Patch @capacitor-firebase/authentication Package.swift
 * to include GoogleSignIn-iOS SDK and RGCFA_INCLUDE_GOOGLE flag.
 *
 * Run after `npm install` or `npx cap sync`:
 *   node scripts/patch-firebase-auth-spm.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const target = join(root, 'node_modules', '@capacitor-firebase', 'authentication', 'Package.swift');

const content = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorFirebaseAuthentication",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapacitorFirebaseAuthentication",
            targets: ["FirebaseAuthenticationPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0"),
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", .upToNextMajor(from: "11.7.0")),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", .upToNextMajor(from: "8.0.0"))
    ],
    targets: [
        .target(
            name: "FirebaseAuthenticationPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Plugin",
            swiftSettings: [
                .define("RGCFA_INCLUDE_GOOGLE")
            ]),
        .testTarget(
            name: "FirebaseAuthenticationPluginTests",
            dependencies: ["FirebaseAuthenticationPlugin"],
            path: "ios/PluginTests")
    ]
)
`;

writeFileSync(target, content, 'utf8');
console.log('✅ Patched @capacitor-firebase/authentication Package.swift with GoogleSignIn + RGCFA_INCLUDE_GOOGLE');
