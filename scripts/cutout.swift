// Cuts the subject (glass, bottle, can) out of a photo with macOS Vision and saves it as a PNG with transparency,
// cropped to the subject. Runs offline, no model downloads.
//
//   swift scripts/cutout.swift <in.jpg|png> <out.png> [<in> <out> ...]
//
// By default every object Vision finds is kept (a bottle and its cap can come out as two). When something else is in
// the frame (a gift box, a second glass), add @x,y to the input — a point on the wanted object, 0…1 from the top left:
//   swift scripts/cutout.swift chivas.jpg@0.67,0.62 chivas.png
// Needs macOS 14+. Prints "ok", "no subject" or the error for every file.
import AppKit
import CoreImage
import Vision

func cutout(_ input: URL, _ output: URL, pick: CGPoint?) throws -> String {
  guard let ci = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else { return "unreadable" }
  let handler = VNImageRequestHandler(ciImage: ci)
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])
  guard let result = request.results?.first, !result.allInstances.isEmpty else { return "no subject" }
  // all instances together (a bottle and its cap can be separate objects), or only the one under the given point
  var instances = result.allInstances
  if let pt = pick {
    let mask = result.instanceMask
    CVPixelBufferLockBaseAddress(mask, .readOnly); defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
    let w = CVPixelBufferGetWidth(mask), h = CVPixelBufferGetHeight(mask), row = CVPixelBufferGetBytesPerRow(mask)
    let px = CVPixelBufferGetBaseAddress(mask)!.assumingMemoryBound(to: UInt8.self)
    let label = Int(px[min(h - 1, Int(pt.y * CGFloat(h))) * row + min(w - 1, Int(pt.x * CGFloat(w)))])
    guard label > 0 else { return "no object at \(pt)" }
    instances = IndexSet(integer: label)
  }
  let buffer = try result.generateMaskedImage(ofInstances: instances, from: handler, croppedToInstancesExtent: true)
  let masked = CIImage(cvPixelBuffer: buffer)
  let ctx = CIContext()
  guard let cg = ctx.createCGImage(masked, from: masked.extent) else { return "render failed" }
  let rep = NSBitmapImageRep(cgImage: cg)
  guard let png = rep.representation(using: .png, properties: [:]) else { return "encode failed" }
  try png.write(to: output)
  return "ok \(cg.width)x\(cg.height)"
}

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 2, args.count % 2 == 0 else {
  FileHandle.standardError.write("usage: swift scripts/cutout.swift <in> <out> [<in> <out> ...]\n".data(using: .utf8)!)
  exit(1)
}
for i in stride(from: 0, to: args.count, by: 2) {
  let parts = args[i].split(separator: "@", maxSplits: 1).map(String.init)
  let xy = parts.count > 1 ? parts[1].split(separator: ",").compactMap { Double($0) } : []
  let pick = xy.count == 2 ? CGPoint(x: xy[0], y: xy[1]) : nil
  let input = URL(fileURLWithPath: parts[0]), output = URL(fileURLWithPath: args[i + 1])
  do { print("\(input.lastPathComponent): \(try cutout(input, output, pick: pick))") } catch { print("\(input.lastPathComponent): \(error)") }
}
