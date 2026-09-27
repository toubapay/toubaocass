import 'client.dart';

class PendingRatingDriver {
  final int id;
  final String? name;
  final String phone;
  final double rating;
  final String? tier;

  PendingRatingDriver({required this.id, required this.name, required this.phone, required this.rating, this.tier});

  factory PendingRatingDriver.fromJson(Map<String, dynamic> json) => PendingRatingDriver(
        id: json['id'] as int,
        name: json['name'] as String?,
        phone: json['phone'] as String,
        rating: (json['rating'] as num).toDouble(),
        tier: json['tier'] as String?,
      );
}

/// The rider's single most recently completed Trip/Delivery/Dem Légui
/// course they haven't rated yet, if any — see
/// RatingController::pendingRating on the backend.
class PendingRating {
  final String type;
  final int id;
  final PendingRatingDriver driver;
  final String? originLabel;
  final String? destinationLabel;
  final double? distanceKm;
  final int? durationMinutes;
  final int? cost;
  final String completedAt;

  PendingRating({
    required this.type,
    required this.id,
    required this.driver,
    this.originLabel,
    this.destinationLabel,
    this.distanceKm,
    this.durationMinutes,
    this.cost,
    required this.completedAt,
  });

  factory PendingRating.fromJson(Map<String, dynamic> json) => PendingRating(
        type: json['type'] as String,
        id: json['id'] as int,
        driver: PendingRatingDriver.fromJson(json['driver'] as Map<String, dynamic>),
        originLabel: json['origin_label'] as String?,
        destinationLabel: json['destination_label'] as String?,
        distanceKm: (json['distance_km'] as num?)?.toDouble(),
        durationMinutes: json['duration_minutes'] as int?,
        cost: json['cost'] as int?,
        completedAt: json['completed_at'] as String,
      );
}

Future<PendingRating?> fetchPendingRating() async {
  final response = await ApiClient.instance.dio.get('/me/pending-rating');
  final data = (response.data as Map<String, dynamic>)['data'];
  return data == null ? null : PendingRating.fromJson(data as Map<String, dynamic>);
}
