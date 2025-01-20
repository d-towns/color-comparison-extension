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

        // Initialize clusters with random pixels
        let clusters: Cluster[] = Array(numColors)
            .fill(null)
            .map(() => ({
                center: this.getRGBFromPixel(
                    Math.floor(Math.random() * (this.pixelData!.length / 3)) * 3
                ),
                pixels: [],
            }));

        const maxIterations = 20;
        let iterations = 0;
        let clustersChanged = true;

        while (clustersChanged && iterations < maxIterations) {
            clustersChanged = false;

            // Reset clusters
            clusters.forEach((cluster) => (cluster.pixels = []));

            // Assign pixels to nearest cluster
            for (let i = 0; i < this.pixelData.length; i += 3) {
                const pixel = this.getRGBFromPixel(i);
                const clusterIndex = this.findNearestCluster(pixel, clusters);
                clusters[clusterIndex].pixels.push(pixel);
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
}