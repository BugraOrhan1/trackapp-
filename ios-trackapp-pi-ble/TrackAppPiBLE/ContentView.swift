import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var bleManager: BLEManager

    private var backgroundColor: Color {
        switch bleManager.signalStatus {
        case .green:
            return Color.green
        case .yellow:
            return Color.yellow
        case .red:
            return Color.red
        case .unknown:
            return Color.black
        }
    }

    private var textColor: Color {
        bleManager.signalStatus == .yellow ? .black : .white
    }

    var body: some View {
        ZStack {
            backgroundColor
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text(bleManager.signalStatus.rawValue)
                    .font(.system(size: 68, weight: .heavy, design: .rounded))
                    .foregroundColor(textColor)

                Text(bleManager.connectionState)
                    .font(.headline)
                    .foregroundColor(textColor.opacity(0.9))

                if !bleManager.lastUpdateText.isEmpty {
                    Text(bleManager.lastUpdateText)
                        .font(.subheadline)
                        .foregroundColor(textColor.opacity(0.85))
                }

                Button(bleManager.isConnected ? "Reconnect" : "Connect") {
                    bleManager.start()
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
            }
            .padding(24)
        }
        .onAppear {
            bleManager.start()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(BLEManager())
}
