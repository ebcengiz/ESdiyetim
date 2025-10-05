// IPFileManager.swift
// ESdiyet uygulaması için IP dosyası yönetimi

import Foundation

class IPFileManager {
    static let shared = IPFileManager()
    private let fileName = "ip.txt"
    
    private init() {}
    
    // Documents dizinine erişim
    private func getDocumentsDirectory() -> URL {
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        return paths[0]
    }
    
    // IP dosyasının tam yolu
    private var ipFileURL: URL {
        return getDocumentsDirectory().appendingPathComponent(fileName)
    }
    
    // IP adresini dosyaya yaz
    func writeIPAddress(_ ipAddress: String) {
        do {
            try ipAddress.write(to: ipFileURL, atomically: true, encoding: .utf8)
            print("✅ IP adresi başarıyla yazıldı: \(ipFileURL.path)")
        } catch {
            print("❌ IP adresi yazma hatası: \(error)")
        }
    }
    
    // IP adresini dosyadan oku
    func readIPAddress() -> String? {
        do {
            let ipAddress = try String(contentsOf: ipFileURL, encoding: .utf8)
            return ipAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            print("❌ IP adresi okuma hatası: \(error)")
            return nil
        }
    }
    
    // IP dosyasının varlığını kontrol et
    func ipFileExists() -> Bool {
        return FileManager.default.fileExists(atPath: ipFileURL.path)
    }
    
    // IP dosyasını sil
    func deleteIPFile() {
        do {
            if ipFileExists() {
                try FileManager.default.removeItem(at: ipFileURL)
                print("✅ IP dosyası silindi")
            }
        } catch {
            print("❌ IP dosyası silme hatası: \(error)")
        }
    }
    
    // Dosya yolunu döndür (debug amaçlı)
    func getFilePath() -> String {
        return ipFileURL.path
    }
}

// MARK: - Kullanım örnekleri
extension IPFileManager {
    
    // Varsayılan IP adresini ayarla
    func setDefaultIP() {
        if !ipFileExists() {
            writeIPAddress("192.168.1.1")
        }
    }
    
    // IP adresini güncelle
    func updateIP(newIP: String) {
        // IP formatını doğrula
        if isValidIP(newIP) {
            writeIPAddress(newIP)
        } else {
            print("❌ Geçersiz IP adresi formatı: \(newIP)")
        }
    }
    
    // IP formatını doğrula
    private func isValidIP(_ ip: String) -> Bool {
        let parts = ip.split(separator: ".")
        guard parts.count == 4 else { return false }
        
        for part in parts {
            guard let number = Int(part), number >= 0, number <= 255 else {
                return false
            }
        }
        return true
    }
}