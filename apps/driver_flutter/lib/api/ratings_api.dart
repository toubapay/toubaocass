import 'package:shared_flutter/api/pagination.dart';

import 'client.dart';

class DriverRating {
  final int id;
  final int score;
  final String? comment;
  final String? raterName;
  final String rateableType;
  final String createdAt;

  DriverRating({
    required this.id,
    required this.score,
    required this.comment,
    required this.raterName,
    required this.rateableType,
    required this.createdAt,
  });

  factory DriverRating.fromJson(Map<String, dynamic> json) => DriverRating(
        id: json['id'] as int,
        score: json['score'] as int,
        comment: json['comment'] as String?,
        raterName: json['rater_name'] as String?,
        rateableType: json['rateable_type'] as String,
        createdAt: json['created_at'] as String,
      );
}

/// Reviews riders/senders have left this driver, across Trip/Dem
/// Légui/Delivery.
Future<Paginated<DriverRating>> fetchMyRatings() async {
  final response = await ApiClient.instance.dio.get('/driver/ratings');
  return Paginated.fromJson(response.data as Map<String, dynamic>, DriverRating.fromJson);
}
