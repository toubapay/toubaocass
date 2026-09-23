import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme.dart';

/// Circular avatar + change/remove controls, shown at the top of a rider's
/// or driver's own profile screen — same role as the web/Expo versions of
/// this widget. Falls back to the first letter of their name when no photo
/// is set yet. [onUpload]/[onRemove] are handed the app's own auth API
/// calls (rider and driver both use the shared `uploadProfilePhoto`/
/// `deleteProfilePhoto` from auth_api.dart) and are expected to push the
/// returned User into AuthProvider.
class ProfilePhotoUploader extends StatefulWidget {
  const ProfilePhotoUploader({
    super.key,
    required this.photoUrl,
    required this.name,
    required this.onUpload,
    required this.onRemove,
  });

  final String? photoUrl;
  final String? name;
  final Future<void> Function(String path) onUpload;
  final Future<void> Function() onRemove;

  @override
  State<ProfilePhotoUploader> createState() => _ProfilePhotoUploaderState();
}

class _ProfilePhotoUploaderState extends State<ProfilePhotoUploader> {
  bool _busy = false;

  String get _initial {
    final n = widget.name?.trim();
    if (n == null || n.isEmpty) return '?';
    return n[0].toUpperCase();
  }

  Future<void> _pick() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (file == null) return;

    setState(() => _busy = true);
    try {
      await widget.onUpload(file.path);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    setState(() => _busy = true);
    try {
      await widget.onRemove();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.accentSoft),
          clipBehavior: Clip.antiAlias,
          child: _busy
              ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
              : widget.photoUrl != null
                  ? Image.network(widget.photoUrl!, fit: BoxFit.cover)
                  : Center(
                      child: Text(_initial,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.primary)),
                    ),
        ),
        const SizedBox(width: AppSpacing.md),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: _busy ? null : _pick,
              child: const Text('Changer la photo',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.primary)),
            ),
            if (widget.photoUrl != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: InkWell(
                  onTap: _busy ? null : _remove,
                  child: const Text('Supprimer la photo',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.danger)),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
