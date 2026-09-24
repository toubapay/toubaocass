import '../models.dart';
import 'client.dart';

Future<MiniFinancialReport> fetchEarningsReport(String range) async {
  final response = await ApiClient.instance.dio.get('/driver/earnings-report', queryParameters: {'range': range});
  final data = response.data as Map<String, dynamic>;

  return MiniFinancialReport(
    range: data['range'] as String,
    total: data['total_earnings'] as int,
    itemsCount: data['items_count'] as int,
    byPeriod: (data['by_period'] as List).map((e) => FinancialReportPeriodRow.fromJson(e as Map<String, dynamic>)).toList(),
    byService:
        (data['by_service'] as List).map((e) => FinancialReportServiceAmountRow.fromJson(e as Map<String, dynamic>)).toList(),
    byVehicle:
        (data['by_vehicle'] as List).map((e) => FinancialReportVehicleRow.fromJson(e as Map<String, dynamic>)).toList(),
    items: (data['items'] as List).map((e) => FinancialReportItem.fromJson(e as Map<String, dynamic>)).toList(),
  );
}
