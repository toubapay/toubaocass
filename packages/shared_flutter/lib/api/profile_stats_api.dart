import 'client.dart';

class ProfileTripSummary {
  final int id;
  final String? originCity;
  final String? destinationCity;
  final String departureDate;
  final String departureTime;
  final String status;

  ProfileTripSummary({
    required this.id,
    required this.originCity,
    required this.destinationCity,
    required this.departureDate,
    required this.departureTime,
    required this.status,
  });

  factory ProfileTripSummary.fromJson(Map<String, dynamic> json) => ProfileTripSummary(
        id: json['id'] as int,
        originCity: json['origin_city'] as String?,
        destinationCity: json['destination_city'] as String?,
        departureDate: json['departure_date'] as String,
        departureTime: json['departure_time'] as String,
        status: json['status'] as String,
      );
}

/// Profile-screen dashboard stats — same `/profile/stats` endpoint for both
/// riders and drivers, ProfileStatsController varies the underlying query
/// by role. Mirrors the web apps' ProfileStats type.
class ProfileStats {
  final int tripsCount;
  final int bookingsCount;
  final int anandoRidesCount;
  final int anandoClientsCount;
  final int earningsTotal;
  final ProfileTripSummary? activeBooking;
  final ProfileTripSummary? lastTrip;

  ProfileStats({
    required this.tripsCount,
    required this.bookingsCount,
    required this.anandoRidesCount,
    required this.anandoClientsCount,
    required this.earningsTotal,
    required this.activeBooking,
    required this.lastTrip,
  });

  factory ProfileStats.fromJson(Map<String, dynamic> json) => ProfileStats(
        tripsCount: json['trips_count'] as int,
        bookingsCount: json['bookings_count'] as int,
        anandoRidesCount: json['anando_rides_count'] as int,
        anandoClientsCount: json['anando_clients_count'] as int,
        earningsTotal: json['earnings_total'] as int,
        activeBooking: json['active_booking'] == null
            ? null
            : ProfileTripSummary.fromJson(json['active_booking'] as Map<String, dynamic>),
        lastTrip: json['last_trip'] == null ? null : ProfileTripSummary.fromJson(json['last_trip'] as Map<String, dynamic>),
      );
}

Future<ProfileStats> fetchProfileStats() async {
  final response = await ApiClient.instance.dio.get('/profile/stats');
  return ProfileStats.fromJson(response.data as Map<String, dynamic>);
}
