allprojects {
    repositories {
        google()
        mavenCentral()
    }
    
    // Ensure JCenter is removed if added by plugins
    repositories.removeIf {
        it is MavenArtifactRepository && it.url.toString().contains("jcenter")
    }
}

subprojects {
    buildscript {
        repositories {
            mavenCentral()
            google()
        }
        // Try to remove jcenter from buildscript repos too
        repositories.removeIf {
            it is MavenArtifactRepository && it.url.toString().contains("jcenter")
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
