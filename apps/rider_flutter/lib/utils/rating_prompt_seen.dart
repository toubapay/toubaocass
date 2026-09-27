import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _storageKey = 'intercity_rating_prompts_seen';
const _maxEntries = 50;
const _storage = FlutterSecureStorage();

/// The post-trip rating sheet on Home is meant to nudge the rider once per
/// completed ride, not every time they reopen the app before actually
/// submitting a star rating — the backend's pending-rating lookup only
/// clears once a rating is saved. Riders can still rate later from their
/// history list, so it's safe to mark a prompt "seen" the moment it's
/// shown, whether or not the rider ends up submitting.
Future<bool> hasSeenRatingPrompt(String type, int id) async {
  final raw = await _storage.read(key: _storageKey);
  if (raw == null || raw.isEmpty) return false;
  return raw.split(',').contains('$type-$id');
}

Future<void> markRatingPromptSeen(String type, int id) async {
  final raw = await _storage.read(key: _storageKey);
  final seen = raw == null || raw.isEmpty ? <String>[] : raw.split(',');
  final key = '$type-$id';
  if (seen.contains(key)) return;
  seen.add(key);
  final trimmed = seen.length > _maxEntries ? seen.sublist(seen.length - _maxEntries) : seen;
  await _storage.write(key: _storageKey, value: trimmed.join(','));
}
