import sharp from 'sharp';

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface Cluster {
    center: RGB;
    pixels: RGB[];
}

export class ColorExtractor {
    private pixelData: Buffer | null;
    private width: number;
    private height: number;

    constructor() {
        this.pixelData = null;
        this.width = 0;
        this.height = 0;
    }

    async loadImage(imageBuffer: Buffer): Promise<void> {
        try {
            // Resize image to reduce processing time while maintaining color distribution
            const image = await sharp(imageBuffer)
                .resize(100, 100, { fit: 'inside' })
                .ensureAlpha() // Ensure alpha channel is present
                .raw()
                .toBuffer({ resolveWithObject: true });

            this.pixelData = image.data;
            this.width = image.info.width;
            this.height = image.info.height;
        } catch (error: any) {
            throw new Error(`Failed to load image: ${error.message}`);
        }
    }

    getRGBFromPixel(offset: number): RGB {
        if (!this.pixelData) {
            throw new Error('No pixel data available');
        }

        return {
            r: this.pixelData[offset],
            g: this.pixelData[offset + 1],
            b: this.pixelData[offset + 2],
        };
    }

    colorDistance(color1: RGB, color2: RGB): number {
        return Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
                Math.pow(color1.g - color2.g, 2) +
                Math.pow(color1.b - color2.b, 2)
        );
    }

    findNearestCluster(color: RGB, clusters: Cluster[]): number {
        let minDistance = Infinity;
        let nearestCluster = 0;

        clusters.forEach((cluster, index) => {
            const distance = this.colorDistance(color, cluster.center);
            if (distance < minDistance) {
                minDistance = distance;
                nearestCluster = index;
            }
        });

        return nearestCluster;
    }

    calculateNewCenter(pixels: RGB[]): RGB {
        const sum = pixels.reduce(
            (acc, pixel) => ({
                r: acc.r + pixel.r,
                g: acc.g + pixel.g,
                b: acc.b + pixel.b,
            }),
            { r: 0, g: 0, b: 0 }
        );

        return {
            r: Math.round(sum.r / pixels.length),
            g: Math.round(sum.g / pixels.length),
            b: Math.round(sum.b / pixels.length),
        };
    }

    async extractColors(numColors: number = 3): Promise<
        { rgb: RGB; hex: string; prevalence: number }[]
    > {
        if (!this.pixelData) {
            throw new Error('No image loaded');
        }

        // Initialize clusters using k-means++
        let clusters: Cluster[] = this.initializeClusters(numColors);

        const maxIterations = 20;
        let iterations = 0;
        let clustersChanged = true;

        while (clustersChanged && iterations < maxIterations) {
            clustersChanged = false;

            // Reset clusters
            clusters.forEach((cluster) => (cluster.pixels = []));

            // Assign pixels to nearest cluster
            for (let i = 0; i < this.pixelData.length; i += 4) { // Include alpha channel
                const alpha = this.pixelData[i + 3];
                if (alpha > 0) { // Skip fully transparent pixels
                    const pixel = this.getRGBFromPixel(i);
                    const clusterIndex = this.findNearestCluster(pixel, clusters);
                    clusters[clusterIndex].pixels.push(pixel);
                }
            }

            // Calculate new centers
            clusters.forEach((cluster) => {
                if (cluster.pixels.length > 0) {
                    const newCenter = this.calculateNewCenter(cluster.pixels);
                    if (this.colorDistance(cluster.center, newCenter) > 1) {
                        cluster.center = newCenter;
                        clustersChanged = true;
                    }
                }
            });

            iterations++;
        }

        // Sort clusters by size (number of pixels)
        return clusters
            .filter((cluster) => cluster.pixels.length > 0)
            .sort((a, b) => b.pixels.length - a.pixels.length)
            .map((cluster) => ({
                rgb: cluster.center,
                hex: `#${cluster.center.r.toString(16).padStart(2, '0')}${
                    cluster.center.g.toString(16).padStart(2, '0')
                }${cluster.center.b.toString(16).padStart(2, '0')}`,
                prevalence: cluster.pixels.length / (this.width * this.height),
            }))
            .slice(0, numColors);
    }

    private initializeClusters(numColors: number): Cluster[] {
        const clusters: Cluster[] = [];
        const usedIndices = new Set<number>();

        // First cluster center is a random pixel
        const firstIndex = Math.floor(Math.random() * (this.pixelData!.length / 4)) * 4;
        clusters.push({
            center: this.getRGBFromPixel(firstIndex),
            pixels: [],
        });
        usedIndices.add(firstIndex);

        // Subsequent centers are chosen using k-means++
        for (let i = 1; i < numColors; i++) {
            let totalDistance = 0;
            const distances: number[] = [];

            for (let j = 0; j < this.pixelData!.length; j += 4) {
                if (!usedIndices.has(j)) {
                    const pixel = this.getRGBFromPixel(j);
                    const nearestCluster = this.findNearestCluster(pixel, clusters);
                    const distance = this.colorDistance(pixel, clusters[nearestCluster].center);
                    distances.push(distance);
                    totalDistance += distance;
                }
            }

            // Choose the next center probabilistically
            const randomValue = Math.random() * totalDistance;
            let cumulativeDistance = 0;
            for (let j = 0; j < distances.length; j++) {
                cumulativeDistance += distances[j];
                if (cumulativeDistance >= randomValue) {
                    const pixelIndex = j * 4;
                    clusters.push({
                        center: this.getRGBFromPixel(pixelIndex),
                        pixels: [],
                    });
                    usedIndices.add(pixelIndex);
                    break;
                }
            }
        }

        return clusters;
    }
}