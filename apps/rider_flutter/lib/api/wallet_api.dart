import '../models.dart';
import 'client.dart';

Future<Wallet> fetchWallet() async {
  final response = await ApiClient.instance.dio.get('/wallet');
  return Wallet.fromJson(response.data as Map<String, dynamic>);
}
